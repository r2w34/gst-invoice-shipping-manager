import db from "../db.server.ts";

export async function getCustomer(id, shop) {
  return await db.customer.findFirst({
    where: { id, shop },
  });
}

export async function getCustomers(shop, { limit = 50, offset = 0, search = "" } = {}) {
  const where = {
    shop,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await db.customer.count({ where });

  return { customers, total };
}

export async function getCustomerByShopifyId(shopifyCustomerId, shop) {
  return await db.customer.findUnique({
    where: { 
      shop_shopifyCustomerId: {
        shop,
        shopifyCustomerId
      }
    },
  });
}

export async function createCustomer(data) {
  const { shop, shopifyCustomerId, name, gstin, email, phone, notes } = data;

  return await db.customer.create({
    data: {
      shop,
      shopifyCustomerId,
      name,
      gstin,
      email,
      phone,
      notes,
    },
  });
}

export async function updateCustomer(id, shop, data) {
  return await db.customer.update({
    where: { id, shop },
    data,
  });
}

export async function deleteCustomer(id, shop) {
  return await db.customer.delete({
    where: { id, shop },
  });
}

export async function syncCustomerFromShopify(shopifyCustomer, shop) {
  const existingCustomer = await getCustomerByShopifyId(shopifyCustomer.id.toString(), shop);
  
  const customerData = {
    shop,
    shopifyCustomerId: shopifyCustomer.id.toString(),
    name: shopifyCustomer.displayName || `${shopifyCustomer.firstName || ''} ${shopifyCustomer.lastName || ''}`.trim(),
    email: shopifyCustomer.email,
    phone: shopifyCustomer.phone,
  };

  if (existingCustomer) {
    return await updateCustomer(existingCustomer.id, shop, customerData);
  } else {
    return await createCustomer(customerData);
  }
}

export async function updateCustomerStats(customerId, shop, orderData) {
  const customer = await getCustomer(customerId, shop);
  if (!customer) return null;

  return await updateCustomer(customerId, shop, {
    totalOrders: customer.totalOrders + 1,
    outstandingAmount: customer.outstandingAmount + (orderData.outstandingAmount || 0),
  });
}

export async function exportCustomersToCSV(shop) {
  const { customers } = await getCustomers(shop, { limit: 10000 });
  
  const csvHeaders = [
    "Name",
    "Email", 
    "Phone",
    "GSTIN",
    "Total Orders",
    "Outstanding Amount",
    "Created Date",
    "Notes"
  ];

  const csvRows = customers.map(customer => [
    customer.name,
    customer.email || "",
    customer.phone || "",
    customer.gstin || "",
    customer.totalOrders,
    customer.outstandingAmount,
    customer.createdAt.toISOString().split('T')[0],
    customer.notes || ""
  ]);

  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map(row => row.map(field => `"${field}"`).join(","))
  ].join("\n");

  return csvContent;
}

export function validateCustomerData(data) {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = "Customer name is required";
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = "Valid email address is required";
  }

  if (data.gstin && !isValidGSTIN(data.gstin)) {
    errors.gstin = "Valid GSTIN format is required (15 characters)";
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = "Valid phone number is required";
  }

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidGSTIN(gstin) {
  // GSTIN format: 2 digits (state code) + 10 characters (PAN) + 1 digit (entity number) + 1 character (Z) + 1 check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

function isValidPhone(phone) {
  // Basic phone validation - can be enhanced based on requirements
  const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

export async function getCustomerInvoices(customerId, shop) {
  const customer = await getCustomer(customerId, shop);
  if (!customer) return [];

  return await db.invoice.findMany({
    where: {
      shop,
      customerName: customer.name,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchCustomers(shop, query) {
  return await db.customer.findMany({
    where: {
      shop,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { gstin: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}