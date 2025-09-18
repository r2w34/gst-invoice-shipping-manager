import db from "../db.server.ts";

export async function getAppSettings(shop) {
  const settings = await db.appSettings.findUnique({
    where: { shop },
  });

  if (!settings) return null;

  return {
    ...settings,
    sellerAddress: JSON.parse(settings.sellerAddress),
  };
}

export async function createAppSettings(data) {
  const { shop, sellerGSTIN, sellerName, sellerAddress, ...rest } = data;

  return await db.appSettings.create({
    data: {
      shop,
      sellerGSTIN,
      sellerName,
      sellerAddress: JSON.stringify(sellerAddress),
      ...rest,
    },
  });
}

export async function updateAppSettings(shop, data) {
  const updateData = { ...data };
  
  if (data.sellerAddress) {
    updateData.sellerAddress = JSON.stringify(data.sellerAddress);
  }

  const settings = await db.appSettings.update({
    where: { shop },
    data: updateData,
  });

  return {
    ...settings,
    sellerAddress: JSON.parse(settings.sellerAddress),
  };
}

export async function createOrUpdateAppSettings(shop, data) {
  const existingSettings = await getAppSettings(shop);
  
  // Convert onboarding data to our format
  const settingsData = {
    sellerGSTIN: data.gstin,
    sellerName: data.companyName,
    sellerAddress: {
      address1: data.address,
      address2: "",
      city: data.city,
      province: data.state,
      country: "India",
      zip: data.pincode,
    },
    sellerPhone: data.phone,
    sellerEmail: data.email,
    invoicePrefix: data.invoicePrefix || "INV",
    currentInvoiceNumber: data.currentInvoiceNumber || 1,
    onboardingComplete: data.onboardingComplete || false,
  };

  if (existingSettings) {
    return await updateAppSettings(shop, settingsData);
  } else {
    return await createAppSettings({
      shop,
      ...settingsData,
    });
  }
}

export async function initializeAppSettings(shop, initialData = {}) {
  const existingSettings = await getAppSettings(shop);
  
  if (existingSettings) {
    return existingSettings;
  }

  const defaultSettings = {
    shop,
    sellerGSTIN: initialData.sellerGSTIN || "",
    sellerName: initialData.sellerName || "",
    sellerAddress: initialData.sellerAddress || {
      address1: "",
      address2: "",
      city: "",
      province: "",
      country: "India",
      zip: "",
    },
    invoicePrefix: "INV",
    invoiceStartNumber: 1,
    currentInvoiceNumber: 1,
    ...initialData,
  };

  return await createAppSettings(defaultSettings);
}

export function validateAppSettings(data) {
  const errors = {};

  if (!data.sellerGSTIN?.trim()) {
    errors.sellerGSTIN = "Seller GSTIN is required";
  } else if (!isValidGSTIN(data.sellerGSTIN)) {
    errors.sellerGSTIN = "Valid GSTIN format is required (15 characters)";
  }

  if (!data.sellerName?.trim()) {
    errors.sellerName = "Seller name is required";
  }

  if (!data.sellerAddress) {
    errors.sellerAddress = "Seller address is required";
  } else {
    if (!data.sellerAddress.address1?.trim()) {
      errors.address1 = "Address line 1 is required";
    }
    if (!data.sellerAddress.city?.trim()) {
      errors.city = "City is required";
    }
    if (!data.sellerAddress.province?.trim()) {
      errors.province = "State/Province is required";
    }
    if (!data.sellerAddress.zip?.trim()) {
      errors.zip = "ZIP/Postal code is required";
    }
  }

  if (data.invoicePrefix && !/^[A-Z0-9]{1,5}$/.test(data.invoicePrefix)) {
    errors.invoicePrefix = "Invoice prefix should be 1-5 uppercase letters/numbers";
  }

  if (data.invoiceStartNumber && (data.invoiceStartNumber < 1 || data.invoiceStartNumber > 999999)) {
    errors.invoiceStartNumber = "Invoice start number should be between 1 and 999999";
  }

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

function isValidGSTIN(gstin) {
  // GSTIN format: 2 digits (state code) + 10 characters (PAN) + 1 digit (entity number) + 1 character (Z) + 1 check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

export async function getSubscription(shop) {
  return await db.subscription.findUnique({
    where: { shop },
  });
}

export async function createSubscription(data) {
  return await db.subscription.create({
    data,
  });
}

export async function updateSubscription(shop, data) {
  return await db.subscription.update({
    where: { shop },
    data,
  });
}

export async function initializeSubscription(shop) {
  const existingSubscription = await getSubscription(shop);
  
  if (existingSubscription) {
    return existingSubscription;
  }

  // Start with 7-day trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  return await createSubscription({
    shop,
    plan: "trial",
    status: "trial",
    trialEndsAt,
    currentPeriodEnd: trialEndsAt,
  });
}

export async function checkSubscriptionLimits(shop, action) {
  const subscription = await getSubscription(shop);
  
  if (!subscription) {
    return { allowed: false, reason: "No subscription found" };
  }

  // Check if subscription is active
  if (subscription.status === "expired" || subscription.status === "cancelled") {
    return { allowed: false, reason: "Subscription expired or cancelled" };
  }

  // Check trial expiry
  if (subscription.status === "trial" && new Date() > subscription.trialEndsAt) {
    return { allowed: false, reason: "Trial period expired" };
  }

  // Check plan limits
  const limits = getPlanLimits(subscription.plan);
  
  if (action === "invoice" && subscription.invoiceCount >= limits.invoices) {
    return { allowed: false, reason: `Invoice limit reached (${limits.invoices})` };
  }

  if (action === "label" && subscription.labelCount >= limits.labels) {
    return { allowed: false, reason: `Label limit reached (${limits.labels})` };
  }

  return { allowed: true };
}

export function getPlanLimits(plan) {
  const limits = {
    trial: { invoices: 10, labels: 10 },
    basic: { invoices: 100, labels: 100 },
    standard: { invoices: 500, labels: 500 },
    premium: { invoices: -1, labels: -1 }, // unlimited
  };

  return limits[plan] || limits.trial;
}

export async function incrementUsage(shop, type) {
  const field = type === "invoice" ? "invoiceCount" : "labelCount";
  
  return await db.subscription.update({
    where: { shop },
    data: {
      [field]: {
        increment: 1,
      },
    },
  });
}