import db from "../db.server";

// Create or update order from Shopify
export async function syncOrderFromShopify(shopifyOrder, shop) {
  try {
    const orderData = {
      shop,
      shopifyOrderId: shopifyOrder.id.toString(),
      orderNumber: shopifyOrder.order_number || shopifyOrder.name,
      email: shopifyOrder.email,
      phone: shopifyOrder.phone,
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      totalPrice: parseFloat(shopifyOrder.total_price || 0),
      subtotalPrice: parseFloat(shopifyOrder.subtotal_price || 0),
      totalTax: parseFloat(shopifyOrder.total_tax || 0),
      currency: shopifyOrder.currency || "INR",
      orderDate: new Date(shopifyOrder.created_at),
      updatedAt: new Date(shopifyOrder.updated_at),
      
      // Customer information
      customerData: shopifyOrder.customer ? {
        shopifyCustomerId: shopifyOrder.customer.id.toString(),
        firstName: shopifyOrder.customer.first_name,
        lastName: shopifyOrder.customer.last_name,
        email: shopifyOrder.customer.email,
        phone: shopifyOrder.customer.phone,
      } : null,
      
      // Billing address
      billingAddress: shopifyOrder.billing_address ? {
        firstName: shopifyOrder.billing_address.first_name,
        lastName: shopifyOrder.billing_address.last_name,
        company: shopifyOrder.billing_address.company,
        address1: shopifyOrder.billing_address.address1,
        address2: shopifyOrder.billing_address.address2,
        city: shopifyOrder.billing_address.city,
        province: shopifyOrder.billing_address.province,
        country: shopifyOrder.billing_address.country,
        zip: shopifyOrder.billing_address.zip,
        phone: shopifyOrder.billing_address.phone,
      } : null,
      
      // Shipping address
      shippingAddress: shopifyOrder.shipping_address ? {
        firstName: shopifyOrder.shipping_address.first_name,
        lastName: shopifyOrder.shipping_address.last_name,
        company: shopifyOrder.shipping_address.company,
        address1: shopifyOrder.shipping_address.address1,
        address2: shopifyOrder.shipping_address.address2,
        city: shopifyOrder.shipping_address.city,
        province: shopifyOrder.shipping_address.province,
        country: shopifyOrder.shipping_address.country,
        zip: shopifyOrder.shipping_address.zip,
        phone: shopifyOrder.shipping_address.phone,
      } : null,
      
      // Line items
      lineItems: shopifyOrder.line_items ? shopifyOrder.line_items.map(item => ({
        shopifyLineItemId: item.id.toString(),
        productId: item.product_id?.toString(),
        variantId: item.variant_id?.toString(),
        title: item.title,
        variantTitle: item.variant_title,
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price),
        totalDiscount: parseFloat(item.total_discount || 0),
        taxLines: item.tax_lines || [],
        fulfillmentService: item.fulfillment_service,
        fulfillmentStatus: item.fulfillment_status,
      })) : [],
      
      // Tax lines
      taxLines: shopifyOrder.tax_lines || [],
      
      // Discount applications
      discountApplications: shopifyOrder.discount_applications || [],
      
      // Shipping lines
      shippingLines: shopifyOrder.shipping_lines || [],
      
      // Note attributes
      noteAttributes: shopifyOrder.note_attributes || [],
      
      // Tags
      tags: shopifyOrder.tags ? shopifyOrder.tags.split(", ") : [],
      
      // Additional fields
      note: shopifyOrder.note,
      gateway: shopifyOrder.gateway,
      sourceIdentifier: shopifyOrder.source_identifier,
      sourceUrl: shopifyOrder.source_url,
      deviceId: shopifyOrder.device_id,
      browserIp: shopifyOrder.browser_ip,
      landingSite: shopifyOrder.landing_site,
      referringSite: shopifyOrder.referring_site,
    };

    // Check if order already exists
    const existingOrder = await db.order.findUnique({
      where: {
        shop_shopifyOrderId: {
          shop,
          shopifyOrderId: orderData.shopifyOrderId,
        },
      },
    });

    let order;
    if (existingOrder) {
      // Update existing order
      order = await db.order.update({
        where: { id: existingOrder.id },
        data: {
          ...orderData,
          customerData: orderData.customerData ? JSON.stringify(orderData.customerData) : null,
          billingAddress: orderData.billingAddress ? JSON.stringify(orderData.billingAddress) : null,
          shippingAddress: orderData.shippingAddress ? JSON.stringify(orderData.shippingAddress) : null,
          lineItems: JSON.stringify(orderData.lineItems),
          taxLines: JSON.stringify(orderData.taxLines),
          discountApplications: JSON.stringify(orderData.discountApplications),
          shippingLines: JSON.stringify(orderData.shippingLines),
          noteAttributes: JSON.stringify(orderData.noteAttributes),
          tags: JSON.stringify(orderData.tags),
        },
      });
    } else {
      // Create new order
      order = await db.order.create({
        data: {
          ...orderData,
          customerData: orderData.customerData ? JSON.stringify(orderData.customerData) : null,
          billingAddress: orderData.billingAddress ? JSON.stringify(orderData.billingAddress) : null,
          shippingAddress: orderData.shippingAddress ? JSON.stringify(orderData.shippingAddress) : null,
          lineItems: JSON.stringify(orderData.lineItems),
          taxLines: JSON.stringify(orderData.taxLines),
          discountApplications: JSON.stringify(orderData.discountApplications),
          shippingLines: JSON.stringify(orderData.shippingLines),
          noteAttributes: JSON.stringify(orderData.noteAttributes),
          tags: JSON.stringify(orderData.tags),
        },
      });
    }

    // Sync customer if exists
    if (orderData.customerData) {
      await syncCustomerFromOrder(orderData.customerData, shop, orderData);
    }

    return {
      ...order,
      customerData: order.customerData ? JSON.parse(order.customerData) : null,
      billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
      lineItems: JSON.parse(order.lineItems),
      taxLines: JSON.parse(order.taxLines),
      discountApplications: JSON.parse(order.discountApplications),
      shippingLines: JSON.parse(order.shippingLines),
      noteAttributes: JSON.parse(order.noteAttributes),
      tags: JSON.parse(order.tags),
    };
  } catch (error) {
    console.error("Error syncing order from Shopify:", error);
    throw error;
  }
}

// Sync customer from order data
async function syncCustomerFromOrder(customerData, shop, orderData) {
  if (!customerData.shopifyCustomerId) return;

  try {
    const existingCustomer = await db.customer.findFirst({
      where: {
        shop,
        shopifyCustomerId: customerData.shopifyCustomerId,
      },
    });

    const customerInfo = {
      shop,
      shopifyCustomerId: customerData.shopifyCustomerId,
      name: `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim(),
      email: customerData.email,
      phone: customerData.phone,
      address: orderData.shippingAddress?.address1,
      city: orderData.shippingAddress?.city,
      state: orderData.shippingAddress?.province,
      pincode: orderData.shippingAddress?.zip,
      country: orderData.shippingAddress?.country || "India",
      isActive: true,
    };

    if (existingCustomer) {
      // Update existing customer
      await db.customer.update({
        where: { id: existingCustomer.id },
        data: {
          ...customerInfo,
          totalOrders: { increment: 1 },
          totalSpent: { increment: orderData.totalPrice },
          lastOrderDate: orderData.orderDate,
        },
      });
    } else {
      // Create new customer
      await db.customer.create({
        data: {
          ...customerInfo,
          totalOrders: 1,
          totalSpent: orderData.totalPrice,
          lastOrderDate: orderData.orderDate,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing customer from order:", error);
  }
}

// Get orders with pagination and filtering
export async function getOrders(shop, options = {}) {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "",
    fulfillmentStatus = "",
    sortBy = "orderDate",
    sortOrder = "desc"
  } = options;

  const skip = (page - 1) * limit;
  
  // Build where clause
  const where = { shop };
  
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (status) {
    where.financialStatus = status;
  }
  
  if (fulfillmentStatus) {
    where.fulfillmentStatus = fulfillmentStatus;
  }

  // Get total count
  const total = await db.order.count({ where });
  
  // Get orders
  const orders = await db.order.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  // Parse JSON fields
  const parsedOrders = orders.map(order => ({
    ...order,
    customerData: order.customerData ? JSON.parse(order.customerData) : null,
    billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    lineItems: JSON.parse(order.lineItems),
    taxLines: JSON.parse(order.taxLines),
    discountApplications: JSON.parse(order.discountApplications),
    shippingLines: JSON.parse(order.shippingLines),
    noteAttributes: JSON.parse(order.noteAttributes),
    tags: JSON.parse(order.tags),
  }));

  return {
    orders: parsedOrders,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// Get single order
export async function getOrder(id, shop) {
  const order = await db.order.findUnique({
    where: { id, shop },
  });

  if (!order) return null;

  return {
    ...order,
    customerData: order.customerData ? JSON.parse(order.customerData) : null,
    billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    lineItems: JSON.parse(order.lineItems),
    taxLines: JSON.parse(order.taxLines),
    discountApplications: JSON.parse(order.discountApplications),
    shippingLines: JSON.parse(order.shippingLines),
    noteAttributes: JSON.parse(order.noteAttributes),
    tags: JSON.parse(order.tags),
  };
}

// Get order by Shopify ID
export async function getOrderByShopifyId(shopifyOrderId, shop) {
  const order = await db.order.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId: shopifyOrderId.toString(),
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    customerData: order.customerData ? JSON.parse(order.customerData) : null,
    billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    lineItems: JSON.parse(order.lineItems),
    taxLines: JSON.parse(order.taxLines),
    discountApplications: JSON.parse(order.discountApplications),
    shippingLines: JSON.parse(order.shippingLines),
    noteAttributes: JSON.parse(order.noteAttributes),
    tags: JSON.parse(order.tags),
  };
}

// Get order statistics
export async function getOrderStats(shop) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [total, thisMonth, today, pending, fulfilled] = await Promise.all([
    db.order.count({ where: { shop } }),
    db.order.count({ 
      where: { 
        shop,
        orderDate: { gte: startOfMonth }
      }
    }),
    db.order.count({ 
      where: { 
        shop,
        orderDate: { gte: startOfDay }
      }
    }),
    db.order.count({ 
      where: { 
        shop,
        fulfillmentStatus: { in: ['pending', 'partial'] }
      }
    }),
    db.order.count({ 
      where: { 
        shop,
        fulfillmentStatus: 'fulfilled'
      }
    }),
  ]);

  // Get revenue stats
  const revenueStats = await db.order.aggregate({
    where: { shop },
    _sum: {
      totalPrice: true,
    },
  });

  const monthlyRevenueStats = await db.order.aggregate({
    where: { 
      shop,
      orderDate: { gte: startOfMonth }
    },
    _sum: {
      totalPrice: true,
    },
  });

  return {
    total,
    thisMonth,
    today,
    pending,
    fulfilled,
    totalRevenue: revenueStats._sum.totalPrice || 0,
    monthlyRevenue: monthlyRevenueStats._sum.totalPrice || 0,
  };
}

// Bulk sync orders from Shopify
export async function bulkSyncOrders(shop, shopifyOrders) {
  const results = [];
  
  for (const shopifyOrder of shopifyOrders) {
    try {
      const order = await syncOrderFromShopify(shopifyOrder, shop);
      results.push({ success: true, order });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        orderId: shopifyOrder.id 
      });
    }
  }

  return results;
}

// Get recent orders
export async function getRecentOrders(shop, limit = 5) {
  const orders = await db.order.findMany({
    where: { shop },
    orderBy: { orderDate: 'desc' },
    take: limit,
  });

  return orders.map(order => ({
    ...order,
    customerData: order.customerData ? JSON.parse(order.customerData) : null,
    billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    lineItems: JSON.parse(order.lineItems),
    taxLines: JSON.parse(order.taxLines),
    discountApplications: JSON.parse(order.discountApplications),
    shippingLines: JSON.parse(order.shippingLines),
    noteAttributes: JSON.parse(order.noteAttributes),
    tags: JSON.parse(order.tags),
  }));
}

// Delete order
export async function deleteOrder(id, shop) {
  return await db.order.delete({
    where: { id, shop },
  });
}

// Update order fulfillment status
export async function updateOrderFulfillment(id, shop, fulfillmentStatus) {
  return await db.order.update({
    where: { id, shop },
    data: { fulfillmentStatus },
  });
}

// Calculate GST for order
export function calculateOrderGST(order, gstRates = {}) {
  const defaultGstRate = 18; // 18% default GST rate
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  const billingState = order.billingAddress?.province;
  const shippingState = order.shippingAddress?.province;
  const isInterState = billingState !== shippingState;
  
  order.lineItems.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const gstRate = gstRates[item.sku] || defaultGstRate;
    const gstAmount = (itemTotal * gstRate) / 100;
    
    if (isInterState) {
      totalIGST += gstAmount;
    } else {
      totalCGST += gstAmount / 2;
      totalSGST += gstAmount / 2;
    }
  });
  
  return {
    totalCGST: Math.round(totalCGST * 100) / 100,
    totalSGST: Math.round(totalSGST * 100) / 100,
    totalIGST: Math.round(totalIGST * 100) / 100,
    totalGST: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100,
    isInterState,
  };
}