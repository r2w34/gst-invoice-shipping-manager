import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Select,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateOrBypass } from "../utils/auth.server";
import { getSubscription, updateSubscription, getAppSettings } from "../models/AppSettings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateOrBypass(request);
  const { shop } = session;

  const [subscription, settings] = await Promise.all([
    getSubscription(shop),
    getAppSettings(shop),
  ]);

  return json({
    subscription,
    settings,
    shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticateOrBypass(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  try {
    if (action === "changePlan") {
      const newPlan = formData.get("plan") as string;
      
      // Update subscription plan
      await updateSubscription(shop, {
        plan: newPlan,
        status: "active",
        updatedAt: new Date().toISOString(),
      });

      return json({ success: true, message: `Successfully changed to ${newPlan} plan` });
    }

    if (action === "cancelSubscription") {
      await updateSubscription(shop, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return json({ success: true, message: "Subscription cancelled successfully" });
    }

    if (action === "reactivateSubscription") {
      await updateSubscription(shop, {
        status: "active",
        cancelledAt: null,
        updatedAt: new Date().toISOString(),
      });

      return json({ success: true, message: "Subscription reactivated successfully" });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Subscription action error:", error);
    return json({ error: "Failed to update subscription" }, { status: 500 });
  }
};

export default function SubscriptionPage() {
  const { subscription, settings, shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

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

  const planOptions = [
    { label: "Basic Plan - ₹999/month", value: "basic" },
    { label: "Standard Plan - ₹1999/month", value: "standard" },
    { label: "Premium Plan - ₹2999/month", value: "premium" },
  ];

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case "basic":
        return [
          "Invoice generation",
          "Single download",
          "Basic CRM",
          "Email support",
        ];
      case "standard":
        return [
          "All Basic features",
          "Bulk processing",
          "Shipping labels",
          "WhatsApp sharing",
          "Priority support",
        ];
      case "premium":
        return [
          "All Standard features",
          "Reports dashboard",
          "Multi-user access",
          "Advanced analytics",
          "Phone support",
          "Custom integrations",
        ];
      default:
        return [];
    }
  };

  const currentPlanFeatures = getPlanFeatures(subscription?.plan || "basic");

  return (
    <Page>
      <TitleBar title="Subscription Management" />
      
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success">
            {actionData.message}
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical">
            {actionData.error}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Current Subscription */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Current Subscription</Text>
                  
                  <InlineStack gap="300" align="space-between">
                    <BlockStack gap="200">
                      <InlineStack gap="200">
                        <Badge tone={subscriptionStatus.color}>{subscriptionStatus.status}</Badge>
                        <Text as="p" variant="bodyMd">
                          {subscription?.plan?.charAt(0).toUpperCase() + subscription?.plan?.slice(1)} Plan
                        </Text>
                      </InlineStack>
                      
                      {subscription?.status === "trial" && subscription?.trialEndsAt && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                        </Text>
                      )}
                      
                      {subscription?.status === "active" && subscription?.nextBillingDate && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                        </Text>
                      )}
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingMd">
                        ₹{subscription?.plan === "premium" ? "2,999" : subscription?.plan === "standard" ? "1,999" : "999"}/month
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  {subscription?.status === "trial" && subscription?.trialEndsAt && (
                    <BlockStack gap="200">
                      <ProgressBar 
                        progress={Math.max(0, Math.min(100, 
                          ((new Date().getTime() - new Date(subscription.createdAt).getTime()) / 
                           (new Date(subscription.trialEndsAt).getTime() - new Date(subscription.createdAt).getTime())) * 100
                        ))}
                        size="small"
                      />
                      <Text as="p" variant="bodySm" tone="subdued">
                        {Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days remaining in trial
                      </Text>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Plan Features */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Current Plan Features</Text>
                  <BlockStack gap="200">
                    {currentPlanFeatures.map((feature, index) => (
                      <InlineStack key={index} gap="200">
                        <Text as="span" variant="bodySm">✓</Text>
                        <Text as="p" variant="bodySm">{feature}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Change Plan */}
              {subscription?.status !== "cancelled" && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Change Plan</Text>
                    <Form method="post">
                      <input type="hidden" name="_action" value="changePlan" />
                      <BlockStack gap="300">
                        <Select
                          label="Select new plan"
                          options={planOptions}
                          value={subscription?.plan || "basic"}
                          name="plan"
                        />
                        <InlineStack>
                          <Button 
                            submit 
                            variant="primary"
                            loading={isSubmitting && navigation.formData?.get("_action") === "changePlan"}
                          >
                            Change Plan
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Form>
                  </BlockStack>
                </Card>
              )}

              {/* Subscription Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Subscription Actions</Text>
                  
                  {subscription?.status === "cancelled" ? (
                    <Form method="post">
                      <input type="hidden" name="_action" value="reactivateSubscription" />
                      <InlineStack>
                        <Button 
                          submit 
                          variant="primary"
                          loading={isSubmitting && navigation.formData?.get("_action") === "reactivateSubscription"}
                        >
                          Reactivate Subscription
                        </Button>
                      </InlineStack>
                    </Form>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="_action" value="cancelSubscription" />
                      <BlockStack gap="300">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Cancelling your subscription will disable all premium features at the end of your current billing period.
                        </Text>
                        <InlineStack>
                          <Button 
                            submit 
                            tone="critical"
                            loading={isSubmitting && navigation.formData?.get("_action") === "cancelSubscription"}
                          >
                            Cancel Subscription
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Form>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Account Information */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Account Information</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      <strong>Shop:</strong> {shop}
                    </Text>
                    {settings?.sellerName && (
                      <Text as="p" variant="bodySm">
                        <strong>Business Name:</strong> {settings.sellerName}
                      </Text>
                    )}
                    {settings?.sellerGSTIN && (
                      <Text as="p" variant="bodySm">
                        <strong>GSTIN:</strong> {settings.sellerGSTIN}
                      </Text>
                    )}
                    <Text as="p" variant="bodySm">
                      <strong>Member since:</strong> {subscription?.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : "N/A"}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Usage Statistics */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Usage This Month</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">Invoices Generated</Text>
                      <Text as="p" variant="bodySm">0</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">Labels Created</Text>
                      <Text as="p" variant="bodySm">0</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">Bulk Operations</Text>
                      <Text as="p" variant="bodySm">0</Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Support */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Need Help?</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      Contact our support team for assistance with your subscription or app features.
                    </Text>
                    <Button url="mailto:support@gstinvoicemanager.com">
                      Contact Support
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}