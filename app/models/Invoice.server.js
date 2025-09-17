import db from "../db.server.ts";

// GST state codes for place of supply calculation
const GST_STATE_CODES = {
  "Andhra Pradesh": "37",
  "Arunachal Pradesh": "12",
  "Assam": "18",
  "Bihar": "10",
  "Chhattisgarh": "22",
  "Goa": "30",
  "Gujarat": "24",
  "Haryana": "06",
  "Himachal Pradesh": "02",
  "Jharkhand": "20",
  "Karnataka": "29",
  "Kerala": "32",
  "Madhya Pradesh": "23",
  "Maharashtra": "27",
  "Manipur": "14",
  "Meghalaya": "17",
  "Mizoram": "15",
  "Nagaland": "13",
  "Odisha": "21",
  "Punjab": "03",
  "Rajasthan": "08",
  "Sikkim": "11",
  "Tamil Nadu": "33",
  "Telangana": "36",
  "Tripura": "16",
  "Uttar Pradesh": "09",
  "Uttarakhand": "05",
  "West Bengal": "19",
  "Delhi": "07",
  "Jammu and Kashmir": "01",
  "Ladakh": "38",
  "Chandigarh": "04",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Lakshadweep": "31",
  "Puducherry": "34",
  "Andaman and Nicobar Islands": "35"
};

// HSN codes for common product categories
const DEFAULT_HSN_CODES = {
  "clothing": "6109",
  "electronics": "8517",
  "books": "4901",
  "food": "2106",
  "cosmetics": "3304",
  "jewelry": "7113",
  "toys": "9503",
  "furniture": "9403",
  "default": "9999"
};

export async function getInvoice(id, shop) {
  const invoice = await db.invoice.findFirst({
    where: { id, shop },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    billingAddress: JSON.parse(invoice.billingAddress),
    shippingAddress: JSON.parse(invoice.shippingAddress),
    items: JSON.parse(invoice.items),
  };
}

export async function getInvoices(shop, { limit = 50, offset = 0 } = {}) {
  const invoices = await db.invoice.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return invoices.map(invoice => ({
    ...invoice,
    billingAddress: JSON.parse(invoice.billingAddress),
    shippingAddress: JSON.parse(invoice.shippingAddress),
    items: JSON.parse(invoice.items),
  }));
}

export async function createInvoice(data) {
  const { shop, orderId, orderName, customerData, items, sellerGSTIN, sellerState } = data;
  
  // Get app settings for invoice numbering
  const settings = await db.appSettings.findUnique({
    where: { shop }
  });

  if (!settings) {
    throw new Error("App settings not configured. Please configure GST settings first.");
  }

  // Generate invoice number
  const invoiceNumber = `${settings.invoicePrefix}-${settings.currentInvoiceNumber.toString().padStart(4, '0')}`;
  
  // Calculate place of supply and tax type
  const customerState = customerData.shippingAddress?.province || customerData.billingAddress?.province;
  const placeOfSupply = `${GST_STATE_CODES[customerState] || "99"}-${customerState || "Unknown"}`;
  const isInterState = sellerState !== customerState;

  // Calculate totals and taxes
  let totalValue = 0;
  let taxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const processedItems = items.map(item => {
    const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
    const discount = parseFloat(item.discount || 0);
    const itemTaxableValue = itemTotal - discount;
    
    // Assume 18% GST rate (can be made configurable)
    const gstRate = 18;
    const taxAmount = (itemTaxableValue * gstRate) / 100;
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (isInterState) {
      igst = taxAmount;
      totalIGST += igst;
    } else {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
      totalCGST += cgst;
      totalSGST += sgst;
    }

    totalValue += itemTotal;
    taxableValue += itemTaxableValue;

    return {
      ...item,
      hsnCode: item.hsnCode || DEFAULT_HSN_CODES[item.category?.toLowerCase()] || DEFAULT_HSN_CODES.default,
      taxableValue: itemTaxableValue,
      cgst,
      sgst,
      igst,
      gstRate,
      total: itemTaxableValue + taxAmount
    };
  });

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      shop,
      orderId,
      orderName,
      customerName: customerData.name,
      customerGSTIN: customerData.gstin,
      billingAddress: JSON.stringify(customerData.billingAddress),
      shippingAddress: JSON.stringify(customerData.shippingAddress),
      sellerGSTIN,
      placeOfSupply,
      items: JSON.stringify(processedItems),
      totalValue: totalValue + totalCGST + totalSGST + totalIGST,
      taxableValue,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      reverseCharge: false,
    },
  });

  // Update invoice counter
  await db.appSettings.update({
    where: { shop },
    data: { currentInvoiceNumber: settings.currentInvoiceNumber + 1 }
  });

  return {
    ...invoice,
    billingAddress: JSON.parse(invoice.billingAddress),
    shippingAddress: JSON.parse(invoice.shippingAddress),
    items: JSON.parse(invoice.items),
  };
}

export async function updateInvoice(id, shop, data) {
  const invoice = await db.invoice.update({
    where: { id, shop },
    data: {
      ...data,
      billingAddress: data.billingAddress ? JSON.stringify(data.billingAddress) : undefined,
      shippingAddress: data.shippingAddress ? JSON.stringify(data.shippingAddress) : undefined,
      items: data.items ? JSON.stringify(data.items) : undefined,
    },
  });

  return {
    ...invoice,
    billingAddress: JSON.parse(invoice.billingAddress),
    shippingAddress: JSON.parse(invoice.shippingAddress),
    items: JSON.parse(invoice.items),
  };
}

export async function deleteInvoice(id, shop) {
  return await db.invoice.delete({
    where: { id, shop },
  });
}

export function validateInvoiceData(data) {
  const errors = {};

  if (!data.customerName?.trim()) {
    errors.customerName = "Customer name is required";
  }

  if (!data.items || data.items.length === 0) {
    errors.items = "At least one item is required";
  }

  if (!data.sellerGSTIN?.trim()) {
    errors.sellerGSTIN = "Seller GSTIN is required";
  }

  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors[`item_${index}_description`] = "Item description is required";
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`item_${index}_quantity`] = "Valid quantity is required";
      }
      if (!item.price || item.price <= 0) {
        errors[`item_${index}_price`] = "Valid price is required";
      }
    });
  }

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

export async function generateInvoicePDF(invoiceId, shop) {
  const invoice = await getInvoice(invoiceId, shop);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const settings = await db.appSettings.findUnique({
    where: { shop }
  });

  // This would typically use a PDF generation library
  // For now, returning the invoice data that can be used by the frontend
  return {
    invoice,
    settings,
    pdfUrl: `/invoices/${invoiceId}/pdf` // This would be the actual PDF URL
  };
}

export function calculateGSTTax(amount, gstRate = 18, isInterState = false) {
  const taxAmount = (amount * gstRate) / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      total: amount + taxAmount
    };
  } else {
    return {
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      total: amount + taxAmount
    };
  }
}

export function getStateCode(stateName) {
  return GST_STATE_CODES[stateName] || "99";
}

export function getHSNCode(productType) {
  return DEFAULT_HSN_CODES[productType?.toLowerCase()] || DEFAULT_HSN_CODES.default;
}

// Get all invoices with filtering and pagination
export async function getAllInvoices(shop, filters = {}) {
  const { search, status, dateFrom, dateTo, page = 1, limit = 10 } = filters;
  
  const where = { shop };
  
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { orderId: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (status) {
    where.status = status;
  }
  
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
    if (dateTo) where.invoiceDate.lte = new Date(dateTo);
  }
  
  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where })
  ]);
  
  return {
    invoices,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

// Get invoice by ID
export async function getInvoiceById(id) {
  return await db.invoice.findUnique({
    where: { id }
  });
}

// Get multiple invoices by IDs
export async function getInvoicesByIds(ids) {
  return await db.invoice.findMany({
    where: { id: { in: ids } }
  });
}

// Additional functions for invoice management

// Bulk delete invoices
export async function bulkDeleteInvoices(ids) {
  return await db.invoice.deleteMany({
    where: { id: { in: ids } }
  });
}

// Get recent invoices for dashboard
export async function getRecentInvoices(shop, limit = 5) {
  return await db.invoice.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

// Get invoice statistics
export async function getInvoiceStats(shop) {
  const [total, thisMonth, paid, pending] = await Promise.all([
    db.invoice.count({ where: { shop } }),
    db.invoice.count({
      where: {
        shop,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    db.invoice.count({ where: { shop, status: 'paid' } }),
    db.invoice.count({ where: { shop, status: { in: ['draft', 'sent'] } } })
  ]);
  
  const totalValue = await db.invoice.aggregate({
    where: { shop },
    _sum: { totalValue: true }
  });
  
  return {
    total,
    thisMonth,
    paid,
    pending,
    totalValue: totalValue._sum.totalValue || 0
  };
}