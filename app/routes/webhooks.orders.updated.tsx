import { type ActionFunctionArgs } from "@remix-run/node";
import { processWebhookOrder, validateWebhookSignature } from "../services/ShopifySync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("X-Shopify-Hmac-Sha256");
    const shop = request.headers.get("X-Shopify-Shop-Domain");
    const topic = request.headers.get("X-Shopify-Topic");

    if (!signature || !shop || !topic) {
      return new Response("Missing required headers", { status: 400 });
    }

    // Validate webhook signature
    const isValid = validateWebhookSignature(
      body,
      signature,
      process.env.SHOPIFY_WEBHOOK_SECRET || ""
    );

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse order data
    const orderData = JSON.parse(body);

    // Process the webhook
    const result = await processWebhookOrder(orderData, shop, topic);

    if (result.success) {
      return new Response("OK", { status: 200 });
    } else {
      console.error("Webhook processing failed:", result.error);
      return new Response("Processing failed", { status: 500 });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500 });
  }
};