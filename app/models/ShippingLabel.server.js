import db from "../db.server.ts";
import QRCode from "qrcode";
import bwipjs from "bwip-js";

export async function getShippingLabel(id, shop) {
  const label = await db.shippingLabel.findFirst({
    where: { id, shop },
  });

  if (!label) return null;

  return {
    ...label,
    customerAddress: JSON.parse(label.customerAddress),
  };
}

export async function getShippingLabels(shop, { limit = 50, offset = 0 } = {}) {
  const labels = await db.shippingLabel.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return labels.map(label => ({
    ...label,
    customerAddress: JSON.parse(label.customerAddress),
  }));
}

export async function createShippingLabel(data) {
  const { shop, orderId, orderName, customerName, customerAddress, trackingId } = data;

  // Generate barcode and QR code if tracking ID is provided
  let barcode = null;
  let qrCode = null;

  if (trackingId) {
    try {
      // Generate Code 128 barcode
      barcode = await generateBarcode(trackingId);
      
      // Generate QR code with tracking URL
      const trackingUrl = `https://track.example.com/${trackingId}`;
      qrCode = await QRCode.toDataURL(trackingUrl);
    } catch (error) {
      console.error("Error generating barcode/QR code:", error);
    }
  }

  const label = await db.shippingLabel.create({
    data: {
      shop,
      orderId,
      orderName,
      customerName,
      customerAddress: JSON.stringify(customerAddress),
      trackingId,
      barcode,
      qrCode,
    },
  });

  return {
    ...label,
    customerAddress: JSON.parse(label.customerAddress),
  };
}

export async function updateShippingLabel(id, shop, data) {
  const updateData = { ...data };
  
  // Generate new barcode/QR code if tracking ID is updated
  if (data.trackingId) {
    try {
      updateData.barcode = await generateBarcode(data.trackingId);
      const trackingUrl = `https://track.example.com/${data.trackingId}`;
      updateData.qrCode = await QRCode.toDataURL(trackingUrl);
    } catch (error) {
      console.error("Error generating barcode/QR code:", error);
    }
  }

  if (data.customerAddress) {
    updateData.customerAddress = JSON.stringify(data.customerAddress);
  }

  const label = await db.shippingLabel.update({
    where: { id, shop },
    data: updateData,
  });

  return {
    ...label,
    customerAddress: JSON.parse(label.customerAddress),
  };
}

export async function deleteShippingLabel(id, shop) {
  return await db.shippingLabel.delete({
    where: { id, shop },
  });
}

export async function createBulkShippingLabels(shop, labelsData) {
  const results = [];
  
  for (const labelData of labelsData) {
    try {
      const label = await createShippingLabel({
        shop,
        ...labelData,
      });
      results.push({ success: true, label });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        orderName: labelData.orderName 
      });
    }
  }

  return results;
}

export async function generateBarcode(text, options = {}) {
  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
      ...options,
    });

    return `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
  } catch (error) {
    console.error("Barcode generation error:", error);
    throw new Error("Failed to generate barcode");
  }
}

export async function generateQRCode(text, options = {}) {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options,
    });
  } catch (error) {
    console.error("QR code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

export function validateShippingLabelData(data) {
  const errors = {};

  if (!data.customerName?.trim()) {
    errors.customerName = "Customer name is required";
  }

  if (!data.customerAddress) {
    errors.customerAddress = "Customer address is required";
  } else {
    if (!data.customerAddress.address1?.trim()) {
      errors.address1 = "Address line 1 is required";
    }
    if (!data.customerAddress.city?.trim()) {
      errors.city = "City is required";
    }
    if (!data.customerAddress.province?.trim()) {
      errors.province = "State/Province is required";
    }
    if (!data.customerAddress.zip?.trim()) {
      errors.zip = "ZIP/Postal code is required";
    }
    if (!data.customerAddress.country?.trim()) {
      errors.country = "Country is required";
    }
  }

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

export async function generateLabelPDF(labelId, shop) {
  const label = await getShippingLabel(labelId, shop);
  if (!label) {
    throw new Error("Shipping label not found");
  }

  const settings = await db.appSettings.findUnique({
    where: { shop }
  });

  // This would typically use a PDF generation library
  // For now, returning the label data that can be used by the frontend
  return {
    label,
    settings,
    pdfUrl: `/labels/${labelId}/pdf` // This would be the actual PDF URL
  };
}

export async function bulkUpdateTrackingIds(shop, trackingData) {
  const results = [];

  for (const { orderId, trackingId } of trackingData) {
    try {
      const label = await db.shippingLabel.findFirst({
        where: { shop, orderId }
      });

      if (label) {
        const updatedLabel = await updateShippingLabel(label.id, shop, { trackingId });
        results.push({ success: true, orderId, label: updatedLabel });
      } else {
        results.push({ success: false, orderId, error: "Label not found" });
      }
    } catch (error) {
      results.push({ success: false, orderId, error: error.message });
    }
  }

  return results;
}

export function formatAddress(address) {
  const parts = [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.country,
    address.zip
  ].filter(Boolean);

  return parts.join(", ");
}

export function generateTrackingId() {
  // Generate a random tracking ID (in real app, this would come from courier API)
  const prefix = "TRK";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function generateLabelNumber() {
  // Generate a unique label number
  const prefix = "LBL";
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Get all shipping labels with filtering and pagination
export async function getAllShippingLabels(shop, options = {}) {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "",
    sortBy = "createdAt",
    sortOrder = "desc"
  } = options;

  const skip = (page - 1) * limit;
  
  // Build where clause
  const where = { shop };
  
  if (search) {
    where.OR = [
      { labelNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { trackingId: { contains: search, mode: 'insensitive' } },
      { orderId: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (status) {
    where.status = status;
  }

  // Get total count
  const total = await db.shippingLabel.count({ where });
  
  // Get labels
  const labels = await db.shippingLabel.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    labels,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// Get shipping label statistics
export async function getShippingLabelStats(shop) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const [total, thisMonth, shipped, pending] = await Promise.all([
    db.shippingLabel.count({ where: { shop } }),
    db.shippingLabel.count({ 
      where: { 
        shop,
        createdAt: { gte: startOfMonth }
      }
    }),
    db.shippingLabel.count({ 
      where: { 
        shop,
        status: { in: ['shipped', 'delivered'] }
      }
    }),
    db.shippingLabel.count({ 
      where: { 
        shop,
        status: { in: ['draft', 'printed'] }
      }
    }),
  ]);

  return {
    total,
    thisMonth,
    shipped,
    pending,
  };
}

// Bulk delete shipping labels
export async function bulkDeleteShippingLabels(shop, labelIds) {
  return await db.shippingLabel.deleteMany({
    where: {
      shop,
      id: { in: labelIds },
    },
  });
}

// Get recent shipping labels
export async function getRecentShippingLabels(shop, limit = 5) {
  return await db.shippingLabel.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// Get labels by IDs
export async function getShippingLabelsByIds(shop, labelIds) {
  return await db.shippingLabel.findMany({
    where: {
      shop,
      id: { in: labelIds },
    },
  });
}