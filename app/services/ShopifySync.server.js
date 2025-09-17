import { authenticate } from "../shopify.server";
import { syncOrderFromShopify, bulkSyncOrders, getOrderStats } from "../models/Order.server";
import { syncCustomerFromShopify } from "../models/Customer.server";

// Fetch orders from Shopify and sync to database
export async function fetchAndSyncOrders(request, options = {}) {
  const { session, admin } = await authenticate.admin(request);
  
  const {
    limit = 50,
    status = "any",
    fulfillmentStatus = "any",
    financialStatus = "any",
    createdAtMin = null,
    createdAtMax = null,
    updatedAtMin = null,
    updatedAtMax = null,
  } = options;

  try {
    // Build query parameters
    const queryParams = {
      limit,
      status,
      fulfillment_status: fulfillmentStatus,
      financial_status: financialStatus,
    };

    if (createdAtMin) queryParams.created_at_min = createdAtMin;
    if (createdAtMax) queryParams.created_at_max = createdAtMax;
    if (updatedAtMin) queryParams.updated_at_min = updatedAtMin;
    if (updatedAtMax) queryParams.updated_at_max = updatedAtMax;

    // Fetch orders from Shopify
    const response = await admin.rest.resources.Order.all({
      session,
      ...queryParams,
    });

    const shopifyOrders = response.data || [];
    
    // Sync orders to database
    const syncResults = await bulkSyncOrders(session.shop, shopifyOrders);
    
    const successCount = syncResults.filter(r => r.success).length;
    const errorCount = syncResults.filter(r => !r.success).length;

    return {
      success: true,
      totalFetched: shopifyOrders.length,
      successCount,
      errorCount,
      results: syncResults,
    };
  } catch (error) {
    console.error("Error fetching and syncing orders:", error);
    return {
      success: false,
      error: error.message,
      totalFetched: 0,
      successCount: 0,
      errorCount: 0,
    };
  }
}

// Fetch single order from Shopify and sync
export async function fetchAndSyncSingleOrder(request, orderId) {
  const { session, admin } = await authenticate.admin(request);

  try {
    // Fetch order from Shopify
    const order = await admin.rest.resources.Order.find({
      session,
      id: orderId,
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found in Shopify",
      };
    }

    // Sync order to database
    const syncedOrder = await syncOrderFromShopify(order, session.shop);

    return {
      success: true,
      order: syncedOrder,
    };
  } catch (error) {
    console.error("Error fetching and syncing single order:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Fetch customers from Shopify and sync to database
export async function fetchAndSyncCustomers(request, options = {}) {
  const { session, admin } = await authenticate.admin(request);
  
  const {
    limit = 50,
    createdAtMin = null,
    createdAtMax = null,
    updatedAtMin = null,
    updatedAtMax = null,
  } = options;

  try {
    // Build query parameters
    const queryParams = { limit };

    if (createdAtMin) queryParams.created_at_min = createdAtMin;
    if (createdAtMax) queryParams.created_at_max = createdAtMax;
    if (updatedAtMin) queryParams.updated_at_min = updatedAtMin;
    if (updatedAtMax) queryParams.updated_at_max = updatedAtMax;

    // Fetch customers from Shopify
    const response = await admin.rest.resources.Customer.all({
      session,
      ...queryParams,
    });

    const shopifyCustomers = response.data || [];
    
    // Sync customers to database
    const results = [];
    for (const shopifyCustomer of shopifyCustomers) {
      try {
        const customer = await syncCustomerFromShopify(shopifyCustomer, session.shop);
        results.push({ success: true, customer });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          customerId: shopifyCustomer.id 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
      success: true,
      totalFetched: shopifyCustomers.length,
      successCount,
      errorCount,
      results,
    };
  } catch (error) {
    console.error("Error fetching and syncing customers:", error);
    return {
      success: false,
      error: error.message,
      totalFetched: 0,
      successCount: 0,
      errorCount: 0,
    };
  }
}

// Fetch products from Shopify
export async function fetchProducts(request, options = {}) {
  const { session, admin } = await authenticate.admin(request);
  
  const {
    limit = 50,
    productType = null,
    vendor = null,
    status = "active",
  } = options;

  try {
    // Build query parameters
    const queryParams = { limit, status };

    if (productType) queryParams.product_type = productType;
    if (vendor) queryParams.vendor = vendor;

    // Fetch products from Shopify
    const response = await admin.rest.resources.Product.all({
      session,
      ...queryParams,
    });

    const products = response.data || [];
    
    // Transform products for easier use
    const transformedProducts = products.map(product => ({
      id: product.id.toString(),
      title: product.title,
      handle: product.handle,
      productType: product.product_type,
      vendor: product.vendor,
      status: product.status,
      tags: product.tags ? product.tags.split(", ") : [],
      variants: product.variants.map(variant => ({
        id: variant.id.toString(),
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price),
        compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        inventoryQuantity: variant.inventory_quantity,
        weight: variant.weight,
        weightUnit: variant.weight_unit,
      })),
      images: product.images.map(image => ({
        id: image.id.toString(),
        src: image.src,
        alt: image.alt,
      })),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));

    return {
      success: true,
      products: transformedProducts,
      totalFetched: products.length,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: error.message,
      products: [],
      totalFetched: 0,
    };
  }
}

// Get sync status and statistics
export async function getSyncStatus(shop) {
  try {
    const orderStats = await getOrderStats(shop);
    
    return {
      success: true,
      stats: {
        orders: orderStats,
        lastSyncAt: new Date().toISOString(), // This would be stored in database in real app
        syncStatus: "active", // This would be tracked in database
      },
    };
  } catch (error) {
    console.error("Error getting sync status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Setup webhooks for real-time sync
export async function setupWebhooks(request) {
  const { session, admin } = await authenticate.admin(request);

  try {
    const webhooks = [
      {
        topic: "orders/create",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/create`,
        format: "json",
      },
      {
        topic: "orders/updated",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/updated`,
        format: "json",
      },
      {
        topic: "orders/paid",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/paid`,
        format: "json",
      },
      {
        topic: "orders/cancelled",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/cancelled`,
        format: "json",
      },
      {
        topic: "orders/fulfilled",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/fulfilled`,
        format: "json",
      },
      {
        topic: "customers/create",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/customers/create`,
        format: "json",
      },
      {
        topic: "customers/update",
        address: `${process.env.SHOPIFY_APP_URL}/webhooks/customers/update`,
        format: "json",
      },
    ];

    const results = [];
    for (const webhookData of webhooks) {
      try {
        const webhook = await admin.rest.resources.Webhook.save({
          session,
          ...webhookData,
        });
        results.push({ success: true, webhook: webhook.id, topic: webhookData.topic });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          topic: webhookData.topic 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      totalWebhooks: webhooks.length,
      successCount,
      errorCount,
      results,
    };
  } catch (error) {
    console.error("Error setting up webhooks:", error);
    return {
      success: false,
      error: error.message,
      totalWebhooks: 0,
      successCount: 0,
      errorCount: 0,
    };
  }
}

// Get existing webhooks
export async function getWebhooks(request) {
  const { session, admin } = await authenticate.admin(request);

  try {
    const response = await admin.rest.resources.Webhook.all({ session });
    const webhooks = response.data || [];

    return {
      success: true,
      webhooks: webhooks.map(webhook => ({
        id: webhook.id.toString(),
        topic: webhook.topic,
        address: webhook.address,
        format: webhook.format,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at,
      })),
    };
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return {
      success: false,
      error: error.message,
      webhooks: [],
    };
  }
}

// Delete webhook
export async function deleteWebhook(request, webhookId) {
  const { session, admin } = await authenticate.admin(request);

  try {
    await admin.rest.resources.Webhook.delete({
      session,
      id: webhookId,
    });

    return {
      success: true,
      message: "Webhook deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Validate webhook signature (for webhook endpoints)
export function validateWebhookSignature(body, signature, secret) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  
  return hash === signature;
}

// Process webhook data
export async function processWebhookOrder(orderData, shop, topic) {
  try {
    switch (topic) {
      case "orders/create":
      case "orders/updated":
      case "orders/paid":
      case "orders/fulfilled":
        await syncOrderFromShopify(orderData, shop);
        break;
      case "orders/cancelled":
        // Handle order cancellation
        await syncOrderFromShopify(orderData, shop);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);
    return { success: false, error: error.message };
  }
}

export async function processWebhookCustomer(customerData, shop, topic) {
  try {
    switch (topic) {
      case "customers/create":
      case "customers/update":
        await syncCustomerFromShopify(customerData, shop);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);
    return { success: false, error: error.message };
  }
}